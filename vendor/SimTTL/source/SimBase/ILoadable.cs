// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimBase
{
    /// <summary>
    /// Interface definition to add a LoadContents method for loading a binary file into theat element.
    /// </summary>
    public interface ILoadable
    {
        /// <summary>
        /// Load the contents of a binary file into the element.
        /// </summary>
        /// <param name="FileName">Full file name of the file to be loaded.</param>
        void LoadContents(string FileName);

        /// <summary>
        /// Return the file name passed in LoadContents
        /// </summary>
        /// <returns>File name used in LoadContents.</returns>
        string GetFileName();
    }
}
